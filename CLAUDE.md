# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 MAJOR UPDATE IN PROGRESS: v2.0.0

**Current Branch**: `v2-clean-atomic-tools`
**Status**: Clean implementation of atomic tools architecture

### What's Changing in v2.0

We are implementing a **complete architectural refactor** from a monolithic `executeCommand` pattern to **atomic MCP tools**. This is a **breaking change** (v1.2.3 → v2.0.0).

**Key Changes:**
- ❌ **Remove**: Single `executeCommand` meta-tool
- ✅ **Add**: 50+ atomic tools (e.g., `siyuan_listNotebooks`, `siyuan_insertBlock`)
- ✅ **Add**: Tool annotations (readOnlyHint, destructiveHint, idempotentHint)
- ✅ **Add**: Missing SiYuan APIs (export, assets, config)
- ✅ **Improve**: LLM ergonomics and performance (80% token reduction in agent context)

### Essential v2.0 Documentation

**Read these documents FIRST before working on v2.0:**

1. **[docs/implementation-plan.md](docs/implementation-plan.md)** - Complete v2.0 implementation guide
2. **[docs/implementation-summary.md](docs/implementation-summary.md)** - Executive summary
3. **[docs/siyuan_API.md](docs/siyuan_API.md)** - SiYuan API reference (cross-check every tool)
4. **[docs/mcp-best-practices.md](docs/mcp-best-practices.md)** - MCP server best practices
5. **[docs/siyuan_mcp_server_reflections.md](docs/siyuan_mcp_server_reflections.md)** - Architecture decisions
6. **[docs/tool-assignment-guidelines.md](docs/tool-assignment-guidelines.md)** - Tool performance guidelines

### v2.0 Implementation Strategy

**Source Code:**
- `src/` - Original v1.2.3 code (DO NOT MODIFY - keep as reference)
- `src-v2/` - Clean v2.0 implementation (WORK HERE)

**Process:**
1. Implement each tool in `src-v2/` with 100% API spec compliance
2. Cross-check against `docs/siyuan_API.md` for every endpoint
3. Add proper annotations based on API behavior (read-only vs destructive)
4. When complete: `rm -rf src && mv src-v2 src`

---

## Project Overview

This is a Model Context Protocol (MCP) server for SiYuan Note, enabling AI models to access and manipulate SiYuan's note data through a standardized interface.

**Key Technologies:**
- TypeScript with ES modules (`"type": "module"`)
- MCP SDK (`@modelcontextprotocol/sdk`)
- Zod for runtime validation
- Axios for HTTP requests
- pnpm as package manager

## Architecture

### v1.2.3 Architecture (Current - `src/`)

The original codebase uses a centralized command registry system (`src/utils/registry.ts`):

- **CommandRegistry**: Singleton that manages all available commands
- **CommandHandler**: Interface defining command structure with namespace, name, description, params (Zod schema), handler function, and optional documentation
- Commands are registered by namespace (e.g., `block.insertBlock`, `notebook.lsNotebooks`)
- **Limitation**: All commands go through single `executeCommand` meta-tool (anti-pattern identified by Gemini AI)

### v2.0.0 Architecture (New - `src-v2/`)

**Clean atomic tools architecture** - each SiYuan API endpoint becomes a direct MCP tool:

1. **Main Server** (`src-v2/server.ts`):
   - Creates MCP server instance with stdio transport
   - Registers 50+ atomic tools directly via `server.tool()`
   - Each tool maps 1:1 with a SiYuan API endpoint
   - Tool naming: `siyuan_<action><Noun>` (e.g., `siyuan_listNotebooks`)

2. **Tool Modules** (`src-v2/tools/`):
   - Each module handles a specific domain (notebook, block, file, etc.)
   - Exports a `register*Tools(server)` function
   - Direct tool registration - no intermediary registry
   - Full Zod validation matching exact API parameters

3. **SiYuan Client** (`src-v2/client.ts`):
   - Singleton HTTP client using axios
   - Configured with base URL (default: `http://localhost:6806`) and token from `SIYUAN_TOKEN` env var
   - Response interceptor for error handling

4. **Tool Annotations** (NEW):
   - `readOnlyHint`: Safe read operations (e.g., `siyuan_listNotebooks`)
   - `destructiveHint`: Destructive operations (e.g., `siyuan_deleteBlock`)
   - `idempotentHint`: Repeated calls have same effect

### v2.0 Tool Categories

#### Atomic Tools (48 tools)
| Category | Count | Examples | Annotations |
|----------|-------|----------|-------------|
| Notebooks | 8 | `siyuan_listNotebooks`, `siyuan_createNotebook` | readOnly, destructive |
| Documents | 10 | `siyuan_createDocWithMd`, `siyuan_removeDoc` | destructive |
| Blocks | 12 | `siyuan_insertBlock`, `siyuan_deleteBlock` | destructive |
| Search | 1 | `siyuan_searchFullText` | readOnly |
| SQL | 2 | `siyuan_sql` | readOnly |
| Assets | 1 | `siyuan_uploadAsset` | - |
| Export | 2 | `siyuan_exportMarkdown`, `siyuan_exportResources` | readOnly |
| Files | 5 | `siyuan_getFile`, `siyuan_removeFile` | destructive |
| Attributes | 2 | `siyuan_setBlockAttrs`, `siyuan_getBlockAttrs` | - |
| Templates | 2 | `siyuan_renderTemplate` | readOnly |
| System | 3 | `siyuan_getVersion` | readOnly |
| **Subtotal** | **48** | Core API coverage | - |

#### LLM-Optimized Composite Tools (3 tools - NEW!)
| Tool | Purpose | Token Savings | Priority |
|------|---------|---------------|----------|
| `siyuan_getContentTree` | Hierarchical overview of notebooks/docs with previews | 80% | 🔥 HIGH |
| `siyuan_getDocumentOutline` | Block-level structure with truncated content | 70% | 🔥 HIGH |
| `siyuan_searchWithContext` | Search results with surrounding context | 60% | HIGH |

**Key Innovation**: These composite tools aggregate multiple API calls server-side, returning optimized, hierarchical data with truncated previews. This dramatically reduces:
- Round-trip API calls (10+ → 1)
- Token consumption (80% reduction)
- LLM decision latency

**Total v2.0 Tools**: **51 tools** (48 atomic + 3 composite)

#### Deferred to v2.1 (6 tools)
- Network proxy, Pandoc conversion, fold/unfold UI, notifications, advanced block refs
- Reason: Low priority, complex, or security concerns

## Development Commands

**Build:**
```bash
pnpm build
```
Compiles TypeScript to `dist/` directory.

**Run (Production):**
```bash
pnpm start
```
Runs compiled code from `dist/server.js`.

**Run (Development):**
```bash
pnpm dev
```
Runs TypeScript directly using ts-node with ESM loader.

**Clean:**
```bash
pnpm clean
```
Removes `dist/` directory.

**Test:**
```bash
pnpm test              # Run all tests
pnpm test:watch        # Run tests in watch mode
```
Uses Jest with ts-jest and experimental VM modules support.

## Environment Variables

**Required:**
- `SIYUAN_TOKEN`: API token for SiYuan Note authentication (found in SiYuan Settings → About)

**Optional:**
- `SIYUAN_API_URL`: Base URL for SiYuan API (default: `http://localhost:6806`)

## Adding New Commands

1. Create or edit a file in `src/tools/commands/`
2. Define a `CommandHandler` object with:
   - `namespace`: Command category (e.g., 'block', 'notebook')
   - `name`: Command name (e.g., 'insertBlock')
   - `description`: Brief description
   - `params`: Zod schema for validation
   - `handler`: Async function returning `McpResponse`
   - `documentation`: (Optional) Detailed docs with examples
3. Register the handler using `registry.registerCommand(handler)`
4. Export a `register*Handlers()` function
5. Import and call the register function in `src/server.ts`

## TypeScript Configuration

- Target: ES2022
- Module: NodeNext with nodenext resolution
- Strict mode enabled
- `noImplicitAny` disabled
- Declaration files generated in `dist/`

## Publishing

Package is published to npm as `@onigeya/siyuan-mcp-server`.
- `prepublishOnly` script runs clean and build automatically
- Public access configured in `publishConfig`
