# Agent Outlines - Planning Document

**Status**: For Review
**Date**: 2025-01-09

---

## Agent 1: Main Orchestrator (7 tools)

**Role**: Fast common queries, delegates complex work

**Tools**:
- getContentTree
- getRecentContent
- findTasks
- getOrCreateDailyNote
- appendBlock
- insertBlock
- Task (delegate)

**Handles**:
- "Show my notebooks" → direct
- "What's new?" → direct
- "Add task to today" → direct
- Complex searches → delegate to Explorer
- Any edits → delegate to Editor
- File ops → delegate to File Manager

---

## Agent 2: Workspace Explorer (20 tools)

**Role**: Pure read-only - search, query, explore

**Tools**:
- **Composite (5)**: getContentTree, getDocumentOutline, searchWithContext, getRecentContent, findTasks
- **Notebooks (2)**: listNotebooks, getNotebookConf
- **Query (3)**: sql, getChildBlocks, getBlockKramdown
- **Attributes (1)**: getBlockAttrs
- **Files-READ (2)**: getFile, readDir
- **Paths (3)**: getHPathByID, getPathByID, getIDsByHPath
- **System (3)**: version, currentTime, bootProgress

**Removed from v1**:
- ❌ All file write ops (upload, remove, rename) → File Manager
- ❌ Templates (render*) → File Manager
- ❌ Exports → File Manager

**Key**: NO write operations at all

---

## Agent 3: Content Editor (16 tools) - REDUCED 33%

**Role**: Edit notebooks/docs/blocks with validation

**Tools**:
- **Read (5)**: getBlockKramdown, getChildBlocks, getBlockAttrs, getHPathByID, getIDsByHPath
- **Notebooks (6)**: create, open, close, setConf, rename, remove
- **Documents (4) - ID-BASED ONLY**:
  - createDocWithMd
  - renameDocByID ✅
  - removeDocByID ✅
  - moveDocsByID ✅
- **Blocks (9)**: insert, append, prepend, update, delete, move, fold, unfold, transferBlockRef
- **Attributes (1)**: setBlockAttrs
- **System (1)**: flushTransaction

**Removed from v1**:
- ❌ renameDoc (path-based) → use renameDocByID
- ❌ removeDoc (path-based) → use removeDocByID
- ❌ moveDocs (path-based) → use moveDocsByID
- ❌ Excess read tools (getDocumentOutline, getRecentContent, getContentTree)
- ❌ Templates → File Manager

**Key**: Only ID-based document tools, minimal read tools

---

## Agent 4: File & Asset Manager (9 tools) - NEW

**Role**: Filesystem ops, uploads, exports, templates

**Tools**:
- **Files (4)**: getFile, readDir, removeFile, renameFile
- **Assets (1)**: uploadAsset
- **Export (2)**: exportMarkdown, exportResources
- **Templates (2)**: renderTemplate, renderSprig

**Rationale**: File operations are conceptually different from content operations

---

## Tool Duplication Issues

### ID-Based vs Path-Based Tools

**Problem**: We have duplicate tools with different approaches:

| Path-Based (Old) | ID-Based (New) | Issue |
|-----------------|---------------|-------|
| renameDoc | renameDocByID | Confusion - which to use? |
| removeDoc | removeDocByID | Requires path resolution |
| moveDocs | moveDocsByID | Path can change, ID is stable |
| getHPathByPath | getHPathByID | Unnecessary variant |

**Recommendation**:
- **Hide path-based from agents** (keep in code for backward compat)
- **Only expose ID-based** to agents
- Agents can convert path→ID using `getIDsByHPath` if needed

**Why ID is better**:
- Stable (paths can change when docs are renamed/moved)
- Direct lookup (no path resolution needed)
- Consistent pattern across all operations

---

## Summary

| Agent | Tools | Change |
|-------|-------|--------|
| Main | 7 | No change |
| Explorer | 20 | -28% (removed 8 write ops) |
| Editor | 16 | -33% (removed 8 tools) |
| File Mgr | 9 | NEW (extracted from others) |

**Total**: 49 tools distributed across 4 agents vs 3

**Benefits**:
- Clearer boundaries
- Less cognitive load per agent
- No tool confusion (only ID-based in Editor)
- Pure read-only Explorer
