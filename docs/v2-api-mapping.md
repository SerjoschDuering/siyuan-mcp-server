# v2.0 API Mapping Checklist

**Cross-reference**: [docs/siyuan_API.md](./siyuan_API.md)
**Status**: Implementation in progress
**Branch**: `v2-clean-atomic-tools`
**Target**: v2.0.0

---

## Implementation Instructions

For each API endpoint below:

1. ✅ **Read API spec** from `docs/siyuan_API.md`
2. ✅ **Create tool** in `src-v2/tools/<category>.ts`
3. ✅ **Match parameters** exactly to API spec using Zod
4. ✅ **Add annotations** (readOnlyHint, destructiveHint, idempotentHint)
5. ✅ **Test** against live SiYuan instance
6. ✅ **Check checkbox** when complete

---

## Notebooks (8 tools)

- [ ] **`siyuan_listNotebooks`**
  - API: `/api/notebook/lsNotebooks`
  - Params: None
  - Returns: `{ notebooks: [...] }`
  - Annotations: `readOnlyHint: true`, `idempotentHint: true`
  - File: `src-v2/tools/notebook.ts`

- [ ] **`siyuan_openNotebook`**
  - API: `/api/notebook/openNotebook`
  - Params: `{ notebook: string }`
  - Returns: `null`
  - Annotations: None
  - File: `src-v2/tools/notebook.ts`

- [ ] **`siyuan_closeNotebook`**
  - API: `/api/notebook/closeNotebook`
  - Params: `{ notebook: string }`
  - Returns: `null`
  - Annotations: None
  - File: `src-v2/tools/notebook.ts`

- [ ] **`siyuan_renameNotebook`**
  - API: `/api/notebook/renameNotebook`
  - Params: `{ notebook: string, name: string }`
  - Returns: `null`
  - Annotations: None
  - File: `src-v2/tools/notebook.ts`

- [ ] **`siyuan_createNotebook`**
  - API: `/api/notebook/createNotebook`
  - Params: `{ name: string }`
  - Returns: `{ notebook: {...} }`
  - Annotations: None
  - File: `src-v2/tools/notebook.ts`

- [ ] **`siyuan_removeNotebook`**
  - API: `/api/notebook/removeNotebook`
  - Params: `{ notebook: string }`
  - Returns: `null`
  - Annotations: `destructiveHint: true`
  - File: `src-v2/tools/notebook.ts`

- [ ] **`siyuan_getNotebookConf`**
  - API: `/api/notebook/getNotebookConf`
  - Params: `{ notebook: string }`
  - Returns: `{ box, conf, name }`
  - Annotations: `readOnlyHint: true`
  - File: `src-v2/tools/notebook.ts`

- [ ] **`siyuan_setNotebookConf`**
  - API: `/api/notebook/setNotebookConf`
  - Params: `{ notebook: string, conf: object }`
  - Returns: `{ ...conf }`
  - Annotations: `destructiveHint: true` (changes system config)
  - File: `src-v2/tools/notebook.ts`

---

## Documents (10 tools)

- [ ] **`siyuan_createDocWithMd`**
  - API: `/api/filetree/createDocWithMd`
  - Params: `{ notebook: string, path: string, markdown: string }`
  - Returns: `"doc-id"`
  - Annotations: None
  - File: `src-v2/tools/document.ts`

- [ ] **`siyuan_renameDoc`**
  - API: `/api/filetree/renameDoc`
  - Params: `{ notebook: string, path: string, title: string }`
  - Returns: `null`
  - Annotations: None
  - File: `src-v2/tools/document.ts`

- [ ] **`siyuan_renameDocByID`** (Bonus - not in v1)
  - API: `/api/filetree/renameDocByID`
  - Params: `{ id: string, title: string }`
  - Returns: `null`
  - Annotations: None
  - File: `src-v2/tools/document.ts`

- [ ] **`siyuan_removeDoc`**
  - API: `/api/filetree/removeDoc`
  - Params: `{ notebook: string, path: string }`
  - Returns: `null`
  - Annotations: `destructiveHint: true`
  - File: `src-v2/tools/document.ts`

- [ ] **`siyuan_removeDocByID`** (Bonus - not in v1)
  - API: `/api/filetree/removeDocByID`
  - Params: `{ id: string }`
  - Returns: `null`
  - Annotations: `destructiveHint: true`
  - File: `src-v2/tools/document.ts`

- [ ] **`siyuan_moveDocs`**
  - API: `/api/filetree/moveDocs`
  - Params: `{ fromPaths: string[], toNotebook: string, toPath: string }`
  - Returns: `null`
  - Annotations: None
  - File: `src-v2/tools/document.ts`

- [ ] **`siyuan_moveDocsByID`** (Bonus - not in v1)
  - API: `/api/filetree/moveDocsByID`
  - Params: `{ fromIDs: string[], toID: string }`
  - Returns: `null`
  - Annotations: None
  - File: `src-v2/tools/document.ts`

- [ ] **`siyuan_getHPathByPath`**
  - API: `/api/filetree/getHPathByPath`
  - Params: `{ notebook: string, path: string }`
  - Returns: `"/human/readable/path"`
  - Annotations: `readOnlyHint: true`, `idempotentHint: true`
  - File: `src-v2/tools/document.ts`

- [ ] **`siyuan_getHPathByID`**
  - API: `/api/filetree/getHPathByID`
  - Params: `{ id: string }`
  - Returns: `"/human/readable/path"`
  - Annotations: `readOnlyHint: true`, `idempotentHint: true`
  - File: `src-v2/tools/document.ts`

- [ ] **`siyuan_getPathByID`**
  - API: `/api/filetree/getPathByID`
  - Params: `{ id: string }`
  - Returns: `{ notebook: string, path: string }`
  - Annotations: `readOnlyHint: true`, `idempotentHint: true`
  - File: `src-v2/tools/document.ts`

- [ ] **`siyuan_getIDsByHPath`**
  - API: `/api/filetree/getIDsByHPath`
  - Params: `{ path: string, notebook: string }`
  - Returns: `["id1", "id2"]`
  - Annotations: `readOnlyHint: true`
  - File: `src-v2/tools/document.ts`

---

## Assets (1 tool)

- [ ] **`siyuan_uploadAssets`**
  - API: `/api/asset/upload`
  - Params: HTTP Multipart form - `{ assetsDirPath: string, file[]: File[] }`
  - Returns: `{ errFiles: string[], succMap: {...} }`
  - Annotations: None
  - File: `src-v2/tools/asset.ts`
  - **Note**: Complex - handles file uploads, may need special handling

---

## Blocks (14 tools)

- [ ] **`siyuan_insertBlock`**
  - API: `/api/block/insertBlock`
  - Params: `{ dataType: 'markdown'|'dom', data: string, nextID?: string, previousID?: string, parentID?: string }`
  - Returns: `[{ doOperations: [...] }]`
  - Annotations: None
  - File: `src-v2/tools/block.ts`

- [ ] **`siyuan_prependBlock`**
  - API: `/api/block/prependBlock`
  - Params: `{ data: string, dataType: 'markdown'|'dom', parentID: string }`
  - Returns: `[{ doOperations: [...] }]`
  - Annotations: None
  - File: `src-v2/tools/block.ts`

- [ ] **`siyuan_appendBlock`**
  - API: `/api/block/appendBlock`
  - Params: `{ data: string, dataType: 'markdown'|'dom', parentID: string }`
  - Returns: `[{ doOperations: [...] }]`
  - Annotations: None
  - File: `src-v2/tools/block.ts`

- [ ] **`siyuan_updateBlock`**
  - API: `/api/block/updateBlock`
  - Params: `{ dataType: 'markdown'|'dom', data: string, id: string }`
  - Returns: `[{ doOperations: [...] }]`
  - Annotations: `idempotentHint: true`
  - File: `src-v2/tools/block.ts`

- [ ] **`siyuan_deleteBlock`**
  - API: `/api/block/deleteBlock`
  - Params: `{ id: string }`
  - Returns: `[{ doOperations: [...] }]`
  - Annotations: `destructiveHint: true`
  - File: `src-v2/tools/block.ts`

- [ ] **`siyuan_moveBlock`**
  - API: `/api/block/moveBlock`
  - Params: `{ id: string, previousID?: string, parentID?: string }`
  - Returns: `[{ doOperations: [...] }]`
  - Annotations: None
  - File: `src-v2/tools/block.ts`

- [ ] **`siyuan_foldBlock`**
  - API: `/api/block/foldBlock`
  - Params: `{ id: string }`
  - Returns: `null`
  - Annotations: None
  - File: `src-v2/tools/block.ts`

- [ ] **`siyuan_unfoldBlock`**
  - API: `/api/block/unfoldBlock`
  - Params: `{ id: string }`
  - Returns: `null`
  - Annotations: None
  - File: `src-v2/tools/block.ts`

- [ ] **`siyuan_getBlockKramdown`**
  - API: `/api/block/getBlockKramdown`
  - Params: `{ id: string }`
  - Returns: `{ id: string, kramdown: string }`
  - Annotations: `readOnlyHint: true`, `idempotentHint: true`
  - File: `src-v2/tools/block.ts`

- [ ] **`siyuan_getChildBlocks`**
  - API: `/api/block/getChildBlocks`
  - Params: `{ id: string }`
  - Returns: `[{ id, type, subType }]`
  - Annotations: `readOnlyHint: true`
  - File: `src-v2/tools/block.ts`

- [ ] **`siyuan_transferBlockRef`**
  - API: `/api/block/transferBlockRef`
  - Params: `{ fromID: string, toID: string, refIDs?: string[] }`
  - Returns: `null`
  - Annotations: None
  - File: `src-v2/tools/block.ts`

---

## Attributes (2 tools)

- [ ] **`siyuan_setBlockAttrs`**
  - API: `/api/attr/setBlockAttrs`
  - Params: `{ id: string, attrs: Record<string, string> }`
  - Returns: `null`
  - Annotations: None
  - File: `src-v2/tools/attribute.ts`

- [ ] **`siyuan_getBlockAttrs`**
  - API: `/api/attr/getBlockAttrs`
  - Params: `{ id: string }`
  - Returns: `{ ...attrs }`
  - Annotations: `readOnlyHint: true`, `idempotentHint: true`
  - File: `src-v2/tools/attribute.ts`

---

## SQL (2 tools)

- [ ] **`siyuan_sql`**
  - API: `/api/query/sql`
  - Params: `{ stmt: string }`
  - Returns: `[{ col: "val" }]`
  - Annotations: `readOnlyHint: true` (assuming SELECT only)
  - File: `src-v2/tools/sql.ts`
  - **Security Note**: Be careful with SQL injection - validate queries

- [ ] **`siyuan_flushTransaction`**
  - API: `/api/sqlite/flushTransaction`
  - Params: None
  - Returns: `null`
  - Annotations: None
  - File: `src-v2/tools/sql.ts`

---

## Templates (2 tools)

- [ ] **`siyuan_renderTemplate`**
  - API: `/api/template/render`
  - Params: `{ id: string, path: string }`
  - Returns: `{ content: string, path: string }`
  - Annotations: `readOnlyHint: true`
  - File: `src-v2/tools/template.ts`

- [ ] **`siyuan_renderSprig`**
  - API: `/api/template/renderSprig`
  - Params: `{ template: string }`
  - Returns: `"rendered-string"`
  - Annotations: `readOnlyHint: true`, `idempotentHint: true`
  - File: `src-v2/tools/template.ts`

---

## File (5 tools)

- [ ] **`siyuan_getFile`**
  - API: `/api/file/getFile`
  - Params: `{ path: string }`
  - Returns: File content (status 200) or error (status 202)
  - Annotations: `readOnlyHint: true`
  - File: `src-v2/tools/file.ts`

- [ ] **`siyuan_putFile`**
  - API: `/api/file/putFile`
  - Params: HTTP Multipart - `{ path: string, isDir?: boolean, modTime?: number, file?: File }`
  - Returns: `null`
  - Annotations: None
  - File: `src-v2/tools/file.ts`

- [ ] **`siyuan_removeFile`**
  - API: `/api/file/removeFile`
  - Params: `{ path: string }`
  - Returns: `null`
  - Annotations: `destructiveHint: true`
  - File: `src-v2/tools/file.ts`

- [ ] **`siyuan_renameFile`**
  - API: `/api/file/renameFile`
  - Params: `{ path: string, newPath: string }`
  - Returns: `null`
  - Annotations: None
  - File: `src-v2/tools/file.ts`

- [ ] **`siyuan_readDir`**
  - API: `/api/file/readDir`
  - Params: `{ path: string }`
  - Returns: `[{ isDir, isSymlink, name, updated }]`
  - Annotations: `readOnlyHint: true`
  - File: `src-v2/tools/file.ts`

---

## Export (2 tools) - **PRIORITY 1** for S3 Backup

- [ ] **`siyuan_exportMarkdown`**
  - API: `/api/export/exportMdContent`
  - Params: `{ id: string }`
  - Returns: `{ hPath: string, content: string }`
  - Annotations: `readOnlyHint: true`
  - File: `src-v2/tools/export.ts`
  - **Priority**: HIGH - needed for backup orchestrator

- [ ] **`siyuan_exportResources`**
  - API: `/api/export/exportResources`
  - Params: `{ paths: string[], name?: string }`
  - Returns: `{ path: string }` (path to .zip file)
  - Annotations: `readOnlyHint: true`
  - File: `src-v2/tools/export.ts`
  - **Priority**: HIGH - needed for backup orchestrator

---

## Conversion (1 tool)

- [ ] **`siyuan_pandoc`**
  - API: `/api/convert/pandoc`
  - Params: `{ dir: string, args: string[] }`
  - Returns: `{ path: string }`
  - Annotations: None
  - File: `src-v2/tools/convert.ts`
  - **Note**: Complex - wraps Pandoc command-line tool

---

## Notification (2 tools)

- [ ] **`siyuan_pushMsg`**
  - API: `/api/notification/pushMsg`
  - Params: `{ msg: string, timeout?: number }`
  - Returns: `{ id: string }`
  - Annotations: None
  - File: `src-v2/tools/notification.ts`

- [ ] **`siyuan_pushErrMsg`**
  - API: `/api/notification/pushErrMsg`
  - Params: `{ msg: string, timeout?: number }`
  - Returns: `{ id: string }`
  - Annotations: None
  - File: `src-v2/tools/notification.ts`

---

## Network (1 tool)

- [ ] **`siyuan_forwardProxy`**
  - API: `/api/network/forwardProxy`
  - Params: `{ url: string, method?: string, timeout?: number, contentType?: string, headers?: object[], payload?: object, payloadEncoding?: string, responseEncoding?: string }`
  - Returns: `{ body, bodyEncoding, contentType, elapsed, headers, status, url }`
  - Annotations: None
  - File: `src-v2/tools/network.ts`
  - **Security Note**: Potential proxy abuse - be careful

---

## System (3 tools)

- [ ] **`siyuan_getBootProgress`**
  - API: `/api/system/bootProgress`
  - Params: None
  - Returns: `{ details: string, progress: number }`
  - Annotations: `readOnlyHint: true`
  - File: `src-v2/tools/system.ts`

- [ ] **`siyuan_getVersion`**
  - API: `/api/system/version`
  - Params: None
  - Returns: `"version-string"`
  - Annotations: `readOnlyHint: true`, `idempotentHint: true`
  - File: `src-v2/tools/system.ts`

- [ ] **`siyuan_getCurrentTime`**
  - API: `/api/system/currentTime`
  - Params: None
  - Returns: `timestamp (milliseconds)`
  - Annotations: `readOnlyHint: true`
  - File: `src-v2/tools/system.ts`

---

## LLM-Optimized Composite Tools (3 tools) - 🔥 HIGH PRIORITY - NEW!

**Purpose**: These tools aggregate multiple API calls server-side to provide LLM-friendly hierarchical views with truncated previews. This dramatically reduces token consumption and round-trip API calls.

- [ ] **`siyuan_getContentTree`**
  - **Composite API**: Uses `listNotebooks` + SQL queries + `getDoc` internally
  - Params:
    ```typescript
    {
      notebook?: string,          // Optional: filter to specific notebook
      maxDepth?: number,          // Default: 2 (notebook → doc → subdoc)
      includePreview?: boolean,   // Default: true (first 200 chars)
      previewLength?: number      // Default: 200
    }
    ```
  - Returns:
    ```typescript
    {
      notebooks: [
        {
          id: string,
          name: string,
          icon: string,
          docCount: number,
          docs: [
            {
              id: string,
              title: string,
              path: string,
              preview: string,      // Truncated content
              blockCount: number,
              created: number,
              updated: number,
              children: [...subdocs]  // Up to maxDepth
            }
          ]
        }
      ]
    }
    ```
  - Annotations: `readOnlyHint: true`, `idempotentHint: true`
  - File: `src-v2/tools/composite.ts`
  - **Token Savings**: 80% (1 call vs 10+ calls)
  - **Use Case**: "Show me all my work notebooks and their main documents"

- [ ] **`siyuan_getDocumentOutline`**
  - **Composite API**: Uses `getChildBlocks` + `getBlockKramdown` + recursive traversal
  - Params:
    ```typescript
    {
      id: string,                 // Document block ID
      includeContent?: boolean,   // Default: true (truncated)
      maxContentLength?: number,  // Default: 100 chars per block
      maxDepth?: number          // Default: 3 levels deep
    }
    ```
  - Returns:
    ```typescript
    {
      id: string,
      title: string,
      outline: [
        {
          id: string,
          type: 'heading' | 'paragraph' | 'list' | 'code' | 'table',
          level?: number,         // For headings: 1-6
          content?: string,       // Truncated if > maxContentLength
          preview: string,        // Always truncated
          fullContent: boolean,   // false if truncated
          blockCount?: number,    // For containers
          children: [...]         // Recursive structure
        }
      ]
    }
    ```
  - Annotations: `readOnlyHint: true`
  - File: `src-v2/tools/composite.ts`
  - **Token Savings**: 70% (1 call vs 5+ calls)
  - **Use Case**: "Edit the third bullet under the Goals section"

- [ ] **`siyuan_searchWithContext`**
  - **Composite API**: Uses `sql` search + `getDoc` + parent block lookup
  - Params:
    ```typescript
    {
      query: string,              // Search query
      method?: 0 | 1 | 2 | 3,    // 0=keyword, 1=query syntax, 2=SQL, 3=regex
      includeParentBlocks?: boolean,  // Default: true
      includeDocumentContext?: boolean, // Default: true
      maxResults?: number,        // Default: 10
      notebooks?: string[]        // Optional: filter by notebooks
    }
    ```
  - Returns:
    ```typescript
    {
      results: [
        {
          blockId: string,
          blockType: string,
          content: string,        // Matching content
          score?: number,         // Relevance score if available
          document: {
            id: string,
            title: string,
            path: string,
            notebook: string
          },
          context: {
            parentBlock?: {      // Heading this block is under
              id: string,
              type: string,
              content: string
            },
            siblings: [          // Previous and next blocks
              { id, type, preview }
            ]
          }
        }
      ],
      totalMatches: number
    }
    ```
  - Annotations: `readOnlyHint: true`
  - File: `src-v2/tools/composite.ts`
  - **Token Savings**: 60% (1 call vs 3+ calls per result)
  - **Use Case**: "Find all mentions of 'Q2 goals' with context"

**Implementation Notes**:
- These are server-side aggregations, not client-side compositions
- Truncation happens server-side to save tokens
- All use atomic tools internally for consistency
- Return rich metadata (IDs, paths, types) for follow-up actions

---

## Search (1 tool) - Not in v1, NEW

- [ ] **`siyuan_searchFullText`**
  - API: Likely `/api/search/fullTextSearch` (check API docs)
  - Params: TBD from actual API
  - Returns: TBD
  - Annotations: `readOnlyHint: true`
  - File: `src-v2/tools/search.ts`
  - **Note**: Implement based on actual SiYuan search API
  - **Note**: This is the atomic version; `siyuan_searchWithContext` is the LLM-optimized version

---

## Summary

### Atomic Tools (48 - deferred 6 low-priority)

| Category | Tools | Priority | Status | Notes |
|----------|-------|----------|--------|-------|
| Notebooks | 8 | Medium | ⏳ Pending | Core |
| Documents | 10 | High | ⏳ Pending | Core |
| Assets | 1 | Medium | ⏳ Pending | Core |
| Blocks | 12 | High | ⏳ Pending | Core (defer fold/unfold) |
| Attributes | 2 | Medium | ⏳ Pending | Core |
| SQL | 2 | Medium | ⏳ Pending | Core |
| Templates | 2 | Low | ⏳ Pending | Core |
| File | 5 | Medium | ⏳ Pending | Core |
| **Export** | **2** | **🔥 HIGH** | ⏳ Pending | **Critical for S3 backup** |
| System | 3 | Low | ⏳ Pending | Core |
| Search | 1 | High | ⏳ Pending | Core (atomic version) |
| **Subtotal** | **48** | - | **0/48 ✅** | v2.0 MVP |

### LLM-Optimized Composite Tools (3 - NEW!)

| Tool | Purpose | Priority | Status | Token Savings |
|------|---------|----------|--------|---------------|
| `siyuan_getContentTree` | Hierarchical notebook/doc overview | 🔥 **HIGHEST** | ⏳ Pending | 80% |
| `siyuan_getDocumentOutline` | Block structure with IDs | 🔥 **HIGHEST** | ⏳ Pending | 70% |
| `siyuan_searchWithContext` | Search with context | 🔥 HIGH | ⏳ Pending | 60% |
| **Subtotal** | **3** | - | **0/3 ✅** | **Game changer** |

### Deferred to v2.1 (6 tools)

| Category | Tools | Reason |
|----------|-------|--------|
| Blocks | 2 | fold/unfold - UI concerns, not content operations |
| Notifications | 2 | pushMsg/pushErrMsg - nice to have |
| Network | 1 | forwardProxy - security concerns, rarely used |
| Conversion | 1 | pandoc - complex, edge case |
| **Subtotal** | **6** | Low priority, will add in v2.1 |

### **TOTAL v2.0 TOOLS: 51** (48 atomic + 3 composite)

---

## Implementation Order (Recommended)

### Phase 1: Core Atomic Tools (Week 1)
1. ✅ System tools (3) - health check, versioning
2. ✅ Notebook tools (8) - fundamental workspace management
3. ✅ Document tools (10) - create, read, update, delete docs
4. ✅ Block tools (12) - content manipulation (defer fold/unfold)

### Phase 1.5: LLM-Optimized Composite Tools (Week 1-2) 🚀 NEW!
5. ✅ **`siyuan_getContentTree`** - HIGHEST priority for LLM navigation
6. ✅ **`siyuan_getDocumentOutline`** - HIGHEST priority for targeted editing
7. ✅ **`siyuan_searchWithContext`** - HIGH priority for intelligent search

**Why Phase 1.5?** These tools unlock the full potential of the atomic tools by providing LLM-friendly aggregated views. Implement after core tools are working but before extensive testing.

### Phase 2: Export & Backup (Week 2)
8. ✅ **Export tools (2)** - PRIORITY for S3 backup workflow
9. ✅ File tools (5) - file system operations
10. ✅ Asset tools (1) - upload images/attachments

### Phase 3: Advanced Features (Week 2-3)
11. ✅ Search tools (1) - atomic full-text search
12. ✅ SQL tools (2) - database queries
13. ✅ Attribute tools (2) - metadata management
14. ✅ Template tools (2) - templating support

---

## Testing Checklist

For each implemented tool:
- [ ] Unit test with mocked client
- [ ] Integration test against live SiYuan
- [ ] Error handling test (invalid params, auth failure)
- [ ] Annotation verification (readOnly, destructive)
- [ ] Documentation complete

---

## Progress Tracking

**Start Date**: 2025-01-02
**Target Completion**: 2025-01-30 (4 weeks)
**Current Progress**: 0/51 tools (0%)

### Breakdown
- Atomic Tools: 0/48 (0%)
- Composite Tools: 0/3 (0%)
- **Total v2.0**: 0/51 (0%)
- Deferred to v2.1: 6 tools

Update this checklist as you implement each tool! ✅
