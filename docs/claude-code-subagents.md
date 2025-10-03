# Claude Code Subagents Configuration Guide

This guide explains how to create, configure, and optimize Claude Code subagents with MCP tools, specifically for the SiYuan MCP Server.

## Table of Contents

- [What are Subagents?](#what-are-subagents)
- [Configuration Methods](#configuration-methods)
- [MCP Tools Integration](#mcp-tools-integration)
- [Example Subagents for SiYuan](#example-subagents-for-siyuan)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## What are Subagents?

**Subagents** are specialized AI assistants in Claude Code that:
- Operate in a separate context window from the main agent
- Have specific expertise areas and purposes
- Can be configured with custom system prompts
- Can have restricted or inherited tool access
- Are automatically invoked based on task description or explicitly called

### Benefits

1. **Performance**: Smaller context windows = faster responses
2. **Focus**: Specialized prompts improve task accuracy
3. **Token Efficiency**: Only load relevant tools and context
4. **Modularity**: Reusable across projects
5. **Clarity**: Clear separation of concerns

## Configuration Methods

### Method 1: Using `/agents` Command (Recommended)

Interactive method for creating and managing agents:

```bash
# In Claude Code session
/agents
```

This command:
- Lists all available tools (including MCP tools)
- Provides an interactive interface for agent configuration
- Helps select tools from a list
- Generates the agent file automatically

### Method 2: Manual File Creation

Create Markdown files in:
- **Project-level**: `.claude/agents/` (version controlled, project-specific)
- **Global-level**: `~/.claude/agents/` (user-wide, available in all projects)

**File Structure:**

```markdown
---
name: agent-name
description: When to invoke this agent
tools: Tool1, Tool2, Tool3
model: inherit
---

# System Prompt

Detailed instructions for the agent...
```

### Method 3: CLI Flag

Dynamically specify agents via command line:

```bash
claude code --agents .claude/agents/my-agent.md
```

## MCP Tools Integration

### Tool Inheritance Modes

#### Full Inheritance (Default)

Omit the `tools` field to inherit all tools from the main thread:

```yaml
---
name: general-assistant
description: General-purpose SiYuan assistant
# No 'tools' field = inherits ALL tools including MCP
---
```

**Pros:**
- Maximum flexibility
- Access to all MCP commands
- No need to update when tools change

**Cons:**
- Slower performance (loads all tool descriptions)
- Higher token consumption
- May confuse the model with too many options

#### Selective Tools (Recommended)

Specify only the tools needed:

```yaml
---
name: notebook-specialist
description: Manages SiYuan notebooks
tools: executeCommand
---

You have access to these notebook commands via executeCommand:
- notebook.lsNotebooks
- notebook.createNotebook
- notebook.renameNotebook
- notebook.removeNotebook
- notebook.openNotebook
- notebook.closeNotebook
```

**Pros:**
- Better performance
- Lower token usage
- Clearer purpose
- Faster response times

**Cons:**
- Must update when adding new relevant tools
- Less flexible

### Accessing MCP Tools

The SiYuan MCP Server exposes tools through the `executeCommand` tool:

```typescript
executeCommand({
  type: "namespace.command",
  params: { /* command parameters */ }
})
```

**Example in subagent prompt:**

```markdown
---
name: content-creator
tools: executeCommand, Read
---

You create and manage SiYuan content.

Use executeCommand with these commands:
1. filetree.createDocWithMd - Create documents
   Example: executeCommand({
     type: "filetree.createDocWithMd",
     params: {
       notebook: "notebook-id",
       path: "/folder/document",
       markdown: "# Content here"
     }
   })

2. block.insertBlock - Insert blocks
   Example: executeCommand({
     type: "block.insertBlock",
     params: {
       dataType: "markdown",
       data: "Block content",
       parentID: "parent-block-id"
     }
   })
```

## Example Subagents for SiYuan

### 1. Notebook Manager

**Purpose**: Manage notebooks (create, list, configure)

**File**: `.claude/agents/siyuan-notebook-manager.md`

```markdown
---
name: siyuan-notebook-manager
description: Manages SiYuan notebooks - creating, listing, configuring, and organizing notebooks
tools: executeCommand
model: inherit
---

# SiYuan Notebook Manager

You are a specialized agent for managing SiYuan notebooks.

## Available Commands

### List Notebooks
```javascript
executeCommand({
  type: "notebook.lsNotebooks",
  params: {}
})
```

### Create Notebook
```javascript
executeCommand({
  type: "notebook.createNotebook",
  params: {
    name: "Notebook Name"
  }
})
```

### Rename Notebook
```javascript
executeCommand({
  type: "notebook.renameNotebook",
  params: {
    notebook: "notebook-id",
    name: "New Name"
  }
})
```

### Open/Close Notebook
```javascript
executeCommand({
  type: "notebook.openNotebook",
  params: { notebook: "notebook-id" }
})

executeCommand({
  type: "notebook.closeNotebook",
  params: { notebook: "notebook-id" }
})
```

### Get/Set Configuration
```javascript
executeCommand({
  type: "notebook.getNotebookConf",
  params: { notebook: "notebook-id" }
})

executeCommand({
  type: "notebook.setNotebookConf",
  params: {
    notebook: "notebook-id",
    conf: { /* configuration object */ }
  }
})
```

## Guidelines

1. Always list notebooks first to get IDs
2. Confirm destructive operations (delete, rename)
3. Provide clear feedback after operations
4. Use notebook IDs, not names, for operations
```

### 2. Content Creator

**Purpose**: Create and edit documents and blocks

**File**: `.claude/agents/siyuan-content-creator.md`

```markdown
---
name: siyuan-content-creator
description: Creates and edits SiYuan documents and content blocks
tools: executeCommand, Read
model: inherit
---

# SiYuan Content Creator

You are a specialized agent for creating and editing SiYuan content.

## Document Operations

### Create Document with Markdown
```javascript
executeCommand({
  type: "filetree.createDocWithMd",
  params: {
    notebook: "notebook-id",
    path: "/folder/document-name",
    markdown: "# Document Title\n\nContent here..."
  }
})
```

### Rename Document
```javascript
executeCommand({
  type: "filetree.renameDoc",
  params: {
    notebook: "notebook-id",
    path: "/old/path",
    title: "New Title"
  }
})
```

## Block Operations

### Insert Block
```javascript
executeCommand({
  type: "block.insertBlock",
  params: {
    dataType: "markdown",
    data: "Block content in Markdown",
    parentID: "parent-block-id"  // or previousID
  }
})
```

### Update Block
```javascript
executeCommand({
  type: "block.updateBlock",
  params: {
    dataType: "markdown",
    data: "Updated content",
    id: "block-id"
  }
})
```

### Get Block Content
```javascript
executeCommand({
  type: "block.getBlockKramdown",
  params: {
    id: "block-id"
  }
})
```

## Attribute Management

### Set Block Attributes
```javascript
executeCommand({
  type: "attr.setBlockAttrs",
  params: {
    id: "block-id",
    attrs: {
      "custom-attr": "value",
      "alias": "Block Alias"
    }
  }
})
```

## Best Practices

1. Use Read tool to check existing content before modifications
2. Always use Markdown format for content creation
3. Retrieve block IDs before updating or deleting
4. Set meaningful attributes for better organization
```

### 3. Search Specialist

**Purpose**: Search and query SiYuan data

**File**: `.claude/agents/siyuan-search-specialist.md`

```markdown
---
name: siyuan-search-specialist
description: Searches and queries SiYuan notes using full-text search and SQL
tools: executeCommand
model: inherit
---

# SiYuan Search Specialist

You are a specialized agent for searching and querying SiYuan notes.

## Search Commands

### Full-Text Search
```javascript
executeCommand({
  type: "search.fullTextSearch",
  params: {
    query: "search terms",
    method: 0  // 0 = keyword, 1 = query syntax, 2 = SQL, 3 = regex
  }
})
```

### SQL Query
```javascript
executeCommand({
  type: "sql.sql",
  params: {
    stmt: "SELECT * FROM blocks WHERE content LIKE '%keyword%' LIMIT 10"
  }
})
```

### Block Query by ID
```javascript
executeCommand({
  type: "query.block",
  params: {
    id: "block-id"
  }
})
```

## Common SQL Queries

### Find Recent Documents
```sql
SELECT * FROM blocks
WHERE type = 'd'
ORDER BY updated DESC
LIMIT 10
```

### Search by Tag
```sql
SELECT * FROM blocks
WHERE content LIKE '%#tag%'
```

### Find Blocks by Type
```sql
SELECT * FROM blocks
WHERE type = 'h'  -- headings
ORDER BY created DESC
```

## Search Best Practices

1. Use full-text search for simple queries
2. Use SQL for complex filtering and sorting
3. Limit results to avoid overwhelming responses
4. Provide context with search results
```

### 4. Export & Backup Specialist

**Purpose**: Export documents and notebooks

**File**: `.claude/agents/siyuan-export-specialist.md`

```markdown
---
name: siyuan-export-specialist
description: Exports SiYuan documents and notebooks in various formats
tools: executeCommand, Bash
model: inherit
---

# SiYuan Export Specialist

You are a specialized agent for exporting SiYuan content.

## Export Commands

### Export Document
```javascript
executeCommand({
  type: "export.exportDoc",
  params: {
    id: "document-id",
    pdf: false,
    format: "markdown"  // or "html", "word"
  }
})
```

### Export Notebook
```javascript
executeCommand({
  type: "export.exportNotebook",
  params: {
    notebook: "notebook-id",
    format: "markdown"
  }
})
```

## Format Conversion

### Pandoc Conversion
```javascript
executeCommand({
  type: "convert.pandoc",
  params: {
    from: "markdown",
    to: "html",
    text: "# Markdown content"
  }
})
```

## Workflow

1. Ask user for export format preference
2. Retrieve document/notebook ID
3. Execute export command
4. Use Bash tool to save file if needed
5. Confirm export success
```

## Best Practices

### 1. Keep Agents Focused

**Bad** (too broad):
```yaml
---
name: siyuan-everything
tools: executeCommand, Read, Write, Bash, Grep
---
Does everything related to SiYuan
```

**Good** (focused):
```yaml
---
name: siyuan-notebook-ops
tools: executeCommand
---
Manages notebooks: create, list, configure, delete
```

### 2. Document Available Commands

Always list the specific commands available, even though they're all accessed via `executeCommand`. This helps the model understand its capabilities.

### 3. Provide Usage Examples

Include real examples in the system prompt:

```markdown
Example workflow:
1. List notebooks to get IDs
2. Create document in selected notebook
3. Add content blocks to document
4. Set block attributes for organization
```

### 4. Use Appropriate Models

```yaml
# For simple operations
model: haiku

# For complex reasoning
model: sonnet

# Inherit from main thread (default)
model: inherit
```

### 5. Version Control Project Agents

Store project-specific agents in `.claude/agents/` and commit them:

```bash
git add .claude/agents/
git commit -m "Add SiYuan specialized agents"
```

### 6. Combine with Other Tools

Don't limit to just `executeCommand`:

```yaml
tools: executeCommand, Read, Grep, Bash
```

This allows agents to:
- Read files before modifying
- Search for content patterns
- Run backup scripts
- Process export data

### 7. Test Agent Performance

Measure response times:

```bash
# Test with different tool configurations
time echo "Create a notebook called 'Test'" | claude code --agents .claude/agents/notebook-manager.md
```

### 8. Update CLAUDE.md

Document your subagents in `CLAUDE.md`:

```markdown
## Available Subagents

- **siyuan-notebook-manager**: Manages notebooks
- **siyuan-content-creator**: Creates/edits documents and blocks
- **siyuan-search-specialist**: Searches and queries notes
- **siyuan-export-specialist**: Exports content

Invoke with: "Use the [agent-name] to..."
```

## Troubleshooting

### Agent Not Found

**Problem**: "Agent 'my-agent' not found"

**Solutions**:
1. Check file exists in `.claude/agents/` or `~/.claude/agents/`
2. Verify file has `.md` extension
3. Check YAML frontmatter is valid
4. Restart Claude Code session

### Tools Not Available

**Problem**: "Tool 'executeCommand' is not available"

**Solutions**:
1. Ensure MCP server is configured in global or project config
2. Check `SIYUAN_TOKEN` environment variable is set
3. Verify MCP server is running: `claude mcp list`
4. Add `--mcp-debug` flag for diagnostics

### Slow Performance

**Problem**: Agent responses are slow

**Solutions**:
1. Reduce number of tools (use selective tools, not inheritance)
2. Simplify system prompt
3. Use faster model (haiku instead of sonnet)
4. Reduce context by focusing agent purpose

### Agent Not Auto-Invoked

**Problem**: Agent doesn't trigger automatically

**Solutions**:
1. Improve `description` field to match use cases
2. Be more explicit in requests: "Use the notebook-manager to..."
3. Check that main agent has access to invoke subagents

### MCP Commands Failing

**Problem**: Commands fail with authentication errors

**Solutions**:
1. Verify `SIYUAN_TOKEN` is correct and not expired
2. Check SiYuan is running (default: http://localhost:6806)
3. Test MCP server: `echo '{"type":"system.getVersion","params":{}}' | npx @onigeya/siyuan-mcp-server`
4. Check MCP server logs for errors

## Advanced Configuration

### Dynamic Tool Assignment

Create multiple agent variants:

```bash
.claude/agents/
├── siyuan-light.md       # 5 tools, fast
├── siyuan-standard.md    # 15 tools, balanced
└── siyuan-full.md        # All tools, comprehensive
```

### Composition Pattern

Main agent delegates to specialized subagents:

```markdown
---
name: siyuan-orchestrator
description: Coordinates SiYuan operations by delegating to specialized agents
tools: Task
---

You coordinate SiYuan tasks by delegating to specialists:

- Notebook operations → use siyuan-notebook-manager
- Content creation → use siyuan-content-creator
- Search queries → use siyuan-search-specialist
- Exports → use siyuan-export-specialist

Analyze the request, determine which specialist to use, and delegate.
```

### Conditional Tool Access

Use environment variables to control tool availability:

```yaml
---
name: siyuan-safe-mode
tools: executeCommand
---

# Read-only commands available:
- notebook.lsNotebooks
- query.block
- search.fullTextSearch
- block.getBlockKramdown

# Destructive commands DISABLED:
- Do NOT use: deleteBlock, removeDoc, removeNotebook
```

## Resources

- [Claude Code Subagents Documentation](https://docs.claude.com/en/docs/claude-code/sub-agents)
- [Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)
- [Tool Assignment Guidelines](./tool-assignment-guidelines.md)
- [MCP Best Practices](./mcp-best-practices.md)
- [SiYuan API Documentation](https://github.com/siyuan-note/siyuan/blob/master/API.md)
