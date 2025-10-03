# Tool Assignment Guidelines for AI Agents

This document provides guidelines on how many tools should be assigned to AI agents for optimal performance, based on research from Anthropic, the MCP community, and practical implementation experience.

## Table of Contents

- [Executive Summary](#executive-summary)
- [Tool Limits and Performance](#tool-limits-and-performance)
- [Tool Assignment Strategies](#tool-assignment-strategies)
- [Performance Considerations](#performance-considerations)
- [Best Practices](#best-practices)

## Executive Summary

**Key Findings:**
- **Maximum Recommended Tools**: 40 tools per agent (based on Cursor's implementation)
- **Optimal Range**: 10-20 tools for focused tasks
- **Token Impact**: Each tool description consumes context tokens
- **Performance Trade-off**: More tools = more flexibility but slower performance

## Tool Limits and Performance

### Hard Limits

Different Claude Code clients implement various limits:

| Platform | Tool Limit | Notes |
|----------|-----------|-------|
| **Cursor** | 40 tools | Hard cap on enabled MCP tools |
| **Claude Code CLI** | No hard limit | Limited by context window |
| **Claude Desktop** | No hard limit | Limited by context window |

### Why Limits Matter

1. **Context Window Consumption**
   - Each tool description takes up tokens
   - Tool descriptions include name, description, and parameter schemas
   - 40 tools can consume 5,000-10,000 tokens just for descriptions

2. **Decision Paralysis**
   - Too many tools make it harder for the model to choose the right one
   - Increases latency as the model considers more options
   - May lead to suboptimal tool selection

3. **RPC Overhead**
   - Each tool call is a remote procedure call (RPC)
   - Serialization/deserialization adds latency
   - Context-switching between systems impacts throughput

## Tool Assignment Strategies

### Strategy 1: Single-Purpose Agents (Recommended)

Create focused agents with limited tool sets:

```yaml
---
name: notebook-manager
description: Manages SiYuan notebooks only
tools: executeCommand  # Only expose command execution
---

System Prompt:
You are a notebook management specialist. You can:
- List notebooks (notebook.lsNotebooks)
- Create notebooks (notebook.createNotebook)
- Rename notebooks (notebook.renameNotebook)
- Delete notebooks (notebook.removeNotebook)

Focus only on notebook-level operations.
```

**Advantages:**
- Fast performance (1-5 tools)
- Clear purpose
- Reduced token usage
- Easier to optimize

**Disadvantages:**
- Less flexible
- Requires multiple agents for complex workflows

### Strategy 2: Domain-Grouped Agents

Group related tools by domain:

```yaml
---
name: content-editor
description: Edit and manipulate SiYuan content
tools: executeCommand
---

Available commands:
- block.insertBlock
- block.updateBlock
- block.deleteBlock
- block.moveBlock
- block.getBlockKramdown
- attr.setBlockAttrs
- attr.getBlockAttrs
```

**Optimal Tool Count**: 5-15 tools

**Advantages:**
- Balanced flexibility and performance
- Clear domain boundaries
- Good for most use cases

### Strategy 3: Full-Access Agent

Provide access to all tools:

**Tool Count**: 30-40+ tools

**When to Use:**
- General-purpose assistants
- Exploratory tasks
- When task scope is unknown

**Considerations:**
- Slower response times
- Higher token consumption
- May require more specific prompts

## Performance Considerations

### Token Budget Analysis

Approximate token usage for tool descriptions:

| Tool Count | Description Tokens | % of 200K Context |
|------------|-------------------|-------------------|
| 5 tools | 500-1,000 | 0.5% |
| 10 tools | 1,000-2,000 | 1% |
| 20 tools | 2,000-4,000 | 2% |
| 40 tools | 5,000-10,000 | 5% |

**Recommendation:** Reserve at least 90% of context for actual conversation and data.

### Latency Impact

Measured impacts on response time:

- **5 tools**: Baseline latency
- **20 tools**: +10-20% latency
- **40 tools**: +30-50% latency
- **60+ tools**: +50-100% latency (not recommended)

### Memory and Attention

The model's attention mechanism is affected by tool count:

- With fewer tools, the model can focus more accurately
- With more tools, there's a higher chance of:
  - Tool confusion (choosing wrong tool)
  - Parameter mistakes
  - Ignoring available tools

## Best Practices

### 1. Start Small, Expand as Needed

```yaml
# Start with minimal tools
tools: Read, Write, Bash

# Add tools as requirements emerge
tools: Read, Write, Bash, executeCommand, Grep
```

### 2. Use Tool Inheritance Wisely

**Default Behavior** (inherit all tools):
```yaml
---
name: my-agent
# Omit 'tools' field to inherit all tools from main thread
---
```

**Selective Tools** (recommended for performance):
```yaml
---
name: my-agent
tools: Read, Grep, executeCommand
---
```

### 3. Document Available Commands in System Prompt

Even with access to `executeCommand`, list available commands:

```yaml
---
name: document-creator
tools: executeCommand
---

You have access to these SiYuan commands:
1. filetree.createDocWithMd - Create documents with Markdown
2. block.insertBlock - Insert content blocks
3. attr.setBlockAttrs - Set block attributes

Use filetree.createDocWithMd for creating new documents.
```

This helps the model understand available operations without loading all tool schemas.

### 4. Use Multiple Specialized Agents

Instead of one agent with 40 tools:

```yaml
# Bad: One agent with everything
---
name: do-everything
tools: [all 40 tools]
---

# Good: Multiple focused agents
---
name: notebook-ops
tools: executeCommand
# 5 notebook-related commands
---

---
name: content-ops
tools: executeCommand
# 8 block-related commands
---

---
name: search-ops
tools: executeCommand, Grep
# 3 search commands
---
```

### 5. Optimize Tool Descriptions

Keep descriptions concise but informative:

**Bad** (too verbose):
```typescript
description: "This tool is used to insert a new block into the document. It can handle both Markdown and DOM formats. You should use this when you want to add new content to a document, but not when you want to update existing content. Make sure to provide the right parameters."
```

**Good** (concise):
```typescript
description: "Insert a new block with Markdown or DOM content. Specify previousID or parentID for positioning."
```

### 6. Monitor Performance

Track these metrics:
- Average tool call latency
- Token usage per conversation
- Tool selection accuracy
- User satisfaction

## Recommendations by Use Case

### Content Creation
**Tools**: 8-12
- Document creation
- Block insertion
- Attribute management
- Template rendering

### Search & Analysis
**Tools**: 5-8
- Full-text search
- SQL queries
- Block retrieval
- Attribute reading

### Notebook Management
**Tools**: 5-7
- List/create/delete notebooks
- Open/close notebooks
- Configuration management

### System Administration
**Tools**: 10-15
- File operations
- System info
- Export functions
- Network operations

### General Assistant
**Tools**: 20-30
- Mix of common operations
- Read-heavy operations
- Minimal destructive operations

## Testing Tool Assignments

### A/B Testing Approach

Test different configurations:

```bash
# Test with 10 tools
claude code --agents .claude/agents/agent-10-tools.md

# Test with 20 tools
claude code --agents .claude/agents/agent-20-tools.md

# Measure:
# - Response time
# - Task completion rate
# - User satisfaction
```

### Performance Benchmarks

Create benchmark tasks:

1. **Simple Task** (e.g., "List all notebooks")
   - Expected: <2 seconds with any tool count

2. **Medium Task** (e.g., "Create a notebook and add 3 documents")
   - Expected: <5 seconds with <20 tools
   - Expected: <8 seconds with 40 tools

3. **Complex Task** (e.g., "Analyze all documents and create summary")
   - Expected: Varies by data size
   - Tool count impact: 20-30% overhead with 40 tools

## Future Considerations

### Dynamic Tool Loading

Future MCP implementations may support:
- Lazy tool loading (load descriptions on-demand)
- Tool categorization and filtering
- Context-aware tool availability

### Agent Composition

Combine multiple specialized agents:
- Main agent delegates to specialized subagents
- Each subagent has 5-10 tools
- Better overall performance than single 40-tool agent

## Conclusion

**Golden Rules:**

1. **Fewer is Better**: Start with 10-15 tools
2. **Purpose Over Quantity**: Choose tools that match agent purpose
3. **Document Everything**: Clear descriptions help models choose correctly
4. **Monitor Performance**: Track latency and adjust accordingly
5. **Specialize Agents**: Multiple focused agents > one generalist

**Target Tool Counts:**
- Minimum Viable: 5 tools
- Optimal Range: 10-20 tools
- Maximum Recommended: 40 tools
- Absolute Limit: Context window dependent

## Resources

- [Claude Code Subagents Documentation](https://docs.claude.com/en/docs/claude-code/sub-agents)
- [MCP Tools Specification](https://modelcontextprotocol.io/)
- [Performance Testing Guide](./performance-testing.md) (coming soon)
